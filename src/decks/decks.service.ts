import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import { Deck } from './deck.entity';
import { DeckCommander } from './deck-commander.entity';
import { DeckTag } from './deck-tag.entity';
import { AvailableTag } from './available-tag.entity';
import { CreateDeckDto } from './dto/create-deck.dto';

@Injectable()
export class DecksService {
  constructor(
    @InjectRepository(Deck)
    private decksRepository: Repository<Deck>,
    @InjectRepository(DeckCommander)
    private deckCommandersRepository: Repository<DeckCommander>,
    @InjectRepository(DeckTag)
    private deckTagsRepository: Repository<DeckTag>,
    @InjectRepository(AvailableTag)
    private availableTagsRepository: Repository<AvailableTag>,
    private httpService: HttpService,
  ) {}

  async createDeck(createDeckDto: CreateDeckDto, userId: string) {
    // Validate commander combination
    const validation = this.validateCommanderCombination(createDeckDto.commanders);
    if (!validation.valid) {
      throw new BadRequestException(validation.error);
    }

    // Check for duplicate commander combination
    await this.checkDuplicateCommanderCombination(createDeckDto.commanders, userId);

    const deck = this.decksRepository.create({
      name: createDeckDto.name,
      description: createDeckDto.description,
      userId,
    });

    const savedDeck = await this.decksRepository.save(deck);

    const commanders = createDeckDto.commanders.map(commander => 
      this.deckCommandersRepository.create({
        ...commander,
        deckId: savedDeck.id,
        colorIdentity: commander.colorIdentity,
      })
    );

    await this.deckCommandersRepository.save(commanders);

    // Save tags if provided
    if (createDeckDto.tags && createDeckDto.tags.length > 0) {
      const tagIds: string[] = [];
      
      for (const tagName of createDeckDto.tags) {
        let tag = await this.availableTagsRepository.findOne({ where: { name: tagName } });
        
        if (!tag) {
          // Create new tag if it doesn't exist
          tag = this.availableTagsRepository.create({ name: tagName });
          tag = await this.availableTagsRepository.save(tag);
        }
        
        tagIds.push(tag.id);
      }
      
      const deckTags = tagIds.map(tagId => 
        this.deckTagsRepository.create({
          tagId,
          deckId: savedDeck.id,
        })
      );
      await this.deckTagsRepository.save(deckTags);
    }

    return this.getDeckById(savedDeck.id, userId);
  }

  async getUserDecks(userId: string) {
    return this.decksRepository.find({
      where: { userId },
      relations: ['commanders', 'tags', 'tags.availableTag'],
      order: { createdAt: 'DESC' },
    });
  }

  async getDeckById(deckId: string, userId: string) {
    const deck = await this.decksRepository.findOne({
      where: { id: deckId, userId },
      relations: ['commanders', 'tags', 'tags.availableTag'],
    });

    if (!deck) {
      throw new NotFoundException('Deck not found');
    }

    return deck;
  }

  async deleteDeck(deckId: string, userId: string) {
    const deck = await this.decksRepository.findOne({
      where: { id: deckId, userId },
    });

    if (!deck) {
      throw new NotFoundException('Deck not found');
    }

    await this.decksRepository.remove(deck);
    return { deleted: true };
  }

  async searchScryfallCommanders(query: string) {
    try {
      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService.get(`https://api.scryfall.com/cards/search`, {
          params: {
            q: `${query} is:commander`,
            format: 'json',
            order: 'name',
          },
        })
      );

      return response.data.data.map((card: any) => ({
        id: card.id,
        name: card.name,
        imageUrl: card.image_uris?.normal || card.image_uris?.large || card.image_uris?.small,
        oracleText: card.oracle_text || '',
        typeLine: card.type_line || '',
        colorIdentity: card.color_identity?.join('') || '',
      }));
    } catch (error) {
      return [];
    }
  }

  validateCommanderCombination(commanders: any[]): { valid: boolean; error?: string } {
    if (commanders.length === 0) {
      return { valid: false, error: 'At least one commander is required' };
    }

    if (commanders.length === 1) {
      return { valid: true };
    }

    if (commanders.length > 2) {
      return { valid: false, error: 'Maximum of 2 commanders allowed' };
    }

    // Two commanders - validate partnership rules
    const [cmd1, cmd2] = commanders;
    
    // Check Partner
    if (this.hasPartner(cmd1) && this.hasPartner(cmd2)) {
      return { valid: true };
    }

    // Check Partner With
    if (this.hasPartnerWith(cmd1, cmd2.name) || this.hasPartnerWith(cmd2, cmd1.name)) {
      return { valid: true };
    }

    // Check Choose a Background
    if (this.hasChooseBackground(cmd1) && this.isBackground(cmd2)) {
      return { valid: true };
    }
    if (this.hasChooseBackground(cmd2) && this.isBackground(cmd1)) {
      return { valid: true };
    }

    // Check Friends Forever
    if (this.hasFriendsForever(cmd1) && this.hasFriendsForever(cmd2)) {
      return { valid: true };
    }

    // Check Doctor's Companion
    if (this.isDoctorsCompanion(cmd1) && this.isDoctor(cmd2)) {
      return { valid: true };
    }
    if (this.isDoctorsCompanion(cmd2) && this.isDoctor(cmd1)) {
      return { valid: true };
    }

    return { valid: false, error: 'These commanders cannot be paired together' };
  }

  private hasPartner(card: any): boolean {
    return card.oracleText?.includes('Partner') && !card.oracleText?.includes('Partner with');
  }

  private hasPartnerWith(card: any, partnerName: string): boolean {
    return card.oracleText?.includes(`Partner with ${partnerName}`);
  }

  private hasChooseBackground(card: any): boolean {
    return card.oracleText?.includes('Choose a Background');
  }

  private isBackground(card: any): boolean {
    return card.typeLine?.includes('Background');
  }

  private hasFriendsForever(card: any): boolean {
    return card.oracleText?.includes('Friends forever');
  }

  private isDoctorsCompanion(card: any): boolean {
    return card.oracleText?.includes("Doctor's companion");
  }

  private isDoctor(card: any): boolean {
    return card.typeLine?.includes('Time Lord Doctor');
  }

  async getAvailableTags(): Promise<string[]> {
    const tags = await this.availableTagsRepository.find({
      order: { name: 'ASC' }
    });
    return tags.map(tag => tag.name);
  }

  async updateDeck(deckId: string, updateDeckDto: CreateDeckDto, userId: string) {
    const deck = await this.decksRepository.findOne({
      where: { id: deckId, userId },
      relations: ['tags']
    });

    if (!deck) {
      throw new NotFoundException('Deck not found');
    }

    // Update basic deck info
    deck.name = updateDeckDto.name;
    deck.description = updateDeckDto.description;
    await this.decksRepository.save(deck);



    // Update tags
    if (updateDeckDto.tags) {
      // Remove existing tags
      await this.deckTagsRepository.delete({ deckId });

      // Add new tags
      const tagIds: string[] = [];
      for (const tagName of updateDeckDto.tags) {
        let tag = await this.availableTagsRepository.findOne({ where: { name: tagName } });
        
        if (!tag) {
          tag = this.availableTagsRepository.create({ name: tagName });
          tag = await this.availableTagsRepository.save(tag);
        }
        
        tagIds.push(tag.id);
      }
      
      const deckTags = tagIds.map(tagId => 
        this.deckTagsRepository.create({
          tagId,
          deckId,
        })
      );
      await this.deckTagsRepository.save(deckTags);
    }

    return this.getDeckById(deckId, userId);
  }

  private async checkDuplicateCommanderCombination(commanders: any[], userId: string) {
    const commanderNames = commanders.map(c => c.name).sort();
    
    const existingDecks = await this.decksRepository.find({
      where: { userId },
      relations: ['commanders']
    });

    for (const deck of existingDecks) {
      const existingCommanderNames = deck.commanders.map(c => c.name).sort();
      if (JSON.stringify(commanderNames) === JSON.stringify(existingCommanderNames)) {
        throw new BadRequestException(`You already have a deck with ${commanderNames.join(' / ')} as commander${commanderNames.length > 1 ? 's' : ''}`);
      }
    }
  }
}