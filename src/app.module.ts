import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';

import { UsersModule } from './users/users.module';
import { User } from './users/user.entity';
import { GroupsModule } from './groups/groups.module';
import { Group } from './groups/group.entity';
import { GroupMembership } from './groups/group-membership.entity';
import { DecksModule } from './decks/decks.module';
import { Deck } from './decks/deck.entity';
import { DeckCommander } from './decks/deck-commander.entity';
import { DeckTag } from './decks/deck-tag.entity';
import { AvailableTag } from './decks/available-tag.entity';

@Module({
  imports: [
    // 1. Load configuration globally and synchronously
    ConfigModule.forRoot({
      isGlobal: true, 
    }),

    // 2. Configure TypeORM/PostgreSQL connection synchronously (CRITICAL FIX for Cloud Run)
    TypeOrmModule.forRoot({
      type: 'postgres',
      // Read environment variables synchronously from the process environment
      url: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false, // Required for Supabase SSL connection from the container
      },
      entities: [User, Group, GroupMembership, Deck, DeckCommander, DeckTag, AvailableTag], // List all entities here
      synchronize: false, // Disabled - using manual SQL schema
      autoLoadEntities: true,
    }),

    // 3. Import feature modules
    AuthModule,
    UsersModule,
    GroupsModule,
    DecksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}