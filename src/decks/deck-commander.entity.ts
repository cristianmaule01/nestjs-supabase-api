import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Deck } from './deck.entity';

@Entity('deck_commanders')
export class DeckCommander {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'deck_id' })
  deckId: string;

  @Column()
  name: string;

  @Column({ name: 'image_url', nullable: true })
  imageUrl?: string;

  @Column({ name: 'scryfall_id', nullable: true })
  scryfallId?: string;

  @Column({ name: 'color_identity', nullable: true })
  colorIdentity?: string;

  @ManyToOne(() => Deck, deck => deck.commanders)
  @JoinColumn({ name: 'deck_id' })
  deck: Deck;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}