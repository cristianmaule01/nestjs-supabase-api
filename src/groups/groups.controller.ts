import { Controller, Post, Get, Put, Body, Query, Param, UseGuards, Request, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  async createGroup(@Body(ValidationPipe) createGroupDto: CreateGroupDto, @Request() req) {
    return this.groupsService.createGroup(createGroupDto, req.user.sub);
  }

  @Post('join')
  async joinGroup(@Body(ValidationPipe) joinGroupDto: JoinGroupDto, @Request() req) {
    return this.groupsService.joinGroup(joinGroupDto, req.user.sub);
  }

  @Get('my-groups')
  async getUserGroups(@Request() req) {
    return this.groupsService.getUserGroups(req.user.sub);
  }

  @Get('search')
  async searchGroups(@Query('q') query: string, @Request() req) {
    return this.groupsService.searchGroups(query || '', req.user.sub);
  }

  @Get(':id/members')
  async getGroupMembers(@Param('id') groupId: string, @Request() req) {
    return this.groupsService.getGroupMembers(groupId, req.user.sub);
  }

  @Post(':id/leave')
  async leaveGroup(@Param('id') groupId: string, @Request() req) {
    return this.groupsService.leaveGroup(groupId, req.user.sub);
  }

  @Post(':id/kick/:userId')
  async kickMember(@Param('id') groupId: string, @Param('userId') targetUserId: string, @Request() req) {
    return this.groupsService.kickMember(groupId, targetUserId, req.user.sub);
  }

  @Put(':id/members/:userId/role')
  async updateMemberRole(@Param('id') groupId: string, @Param('userId') targetUserId: string, @Body() body: { role: string }, @Request() req) {
    return this.groupsService.updateMemberRole(groupId, targetUserId, body.role, req.user.sub);
  }

  @Get('invite/:referrerId/:groupId')
  async getInviteInfo(@Param('referrerId') referrerId: string, @Param('groupId') groupId: string, @Request() req) {
    return this.groupsService.getInviteInfo(referrerId, groupId, req.user.sub);
  }

  @Post('invite/:referrerId/:groupId/accept')
  async acceptInvite(@Param('referrerId') referrerId: string, @Param('groupId') groupId: string, @Body() body: { password?: string }, @Request() req) {
    return this.groupsService.acceptInvite(referrerId, groupId, req.user.sub, body.password);
  }

  @Get('search-users')
  async searchUsers(@Query('q') query: string) {
    return this.groupsService.searchUsers(query || '');
  }

  @Post(':id/invite')
  async sendInvite(@Param('id') groupId: string, @Body() body: { inviteeId: string }, @Request() req) {
    return this.groupsService.sendInvite(groupId, body.inviteeId, req.user.sub);
  }

  @Get('invites/received')
  async getUserInvites(@Request() req) {
    return this.groupsService.getUserInvites(req.user.sub);
  }

  @Get('invites/sent')
  async getSentInvites(@Request() req) {
    return this.groupsService.getSentInvites(req.user.sub);
  }

  @Put('invites/:id/status')
  async updateInviteStatus(@Param('id') inviteId: string, @Body() body: { status: string }, @Request() req) {
    return this.groupsService.updateInviteStatus(inviteId, body.status, req.user.sub);
  }
}