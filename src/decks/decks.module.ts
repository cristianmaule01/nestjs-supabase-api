import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { DecksController } from './decks.controller';
import { DecksService } from './decks.service';
import { Deck } from './deck.entity';
import { DeckCommander } from './deck-commander.entity';
import { DeckTag } from './deck-tag.entity';
import { AvailableTag } from './available-tag.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Deck, DeckCommander, DeckTag, AvailableTag]),
    HttpModule,
  ],
  controllers: [DecksController],
  providers: [DecksService],
  exports: [DecksService],
})
export class DecksModule {}