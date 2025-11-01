import { Controller, Post, Get, Delete, Put, Body, Param, UseGuards, Request, ValidationPipe, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DecksService } from './decks.service';
import { CreateDeckDto } from './dto/create-deck.dto';

@Controller('decks')
@UseGuards(JwtAuthGuard)
export class DecksController {
  constructor(private readonly decksService: DecksService) {}

  @Post()
  async createDeck(@Body(ValidationPipe) createDeckDto: CreateDeckDto, @Request() req) {
    return this.decksService.createDeck(createDeckDto, req.user.sub);
  }

  @Get('my-decks')
  async getUserDecks(@Request() req) {
    return this.decksService.getUserDecks(req.user.sub);
  }

  @Get('search-commanders')
  async searchCommanders(@Query('q') query: string) {
    return this.decksService.searchScryfallCommanders(query || '');
  }

  @Get('available-tags')
  async getAvailableTags() {
    return this.decksService.getAvailableTags();
  }

  @Get('user/:userId')
  async getUserDecksById(@Param('userId') userId: string) {
    return this.decksService.getUserDecks(userId);
  }

  @Get(':id')
  async getDeck(@Param('id') deckId: string, @Request() req) {
    return this.decksService.getDeckById(deckId, req.user.sub);
  }

  @Delete(':id')
  async deleteDeck(@Param('id') deckId: string, @Request() req) {
    return this.decksService.deleteDeck(deckId, req.user.sub);
  }

  @Put(':id')
  async updateDeck(@Param('id') deckId: string, @Body(ValidationPipe) updateDeckDto: CreateDeckDto, @Request() req) {
    return this.decksService.updateDeck(deckId, updateDeckDto, req.user.sub);
  }
}