import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Deck } from './deck.entity';
import { AvailableTag } from './available-tag.entity';

@Entity('deck_tags')
export class DeckTag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'deck_id' })
  deckId: string;

  @Column({ name: 'tag_id' })
  tagId: string;

  @ManyToOne(() => Deck, deck => deck.tags)
  @JoinColumn({ name: 'deck_id' })
  deck: Deck;

  @ManyToOne(() => AvailableTag)
  @JoinColumn({ name: 'tag_id' })
  availableTag: AvailableTag;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}