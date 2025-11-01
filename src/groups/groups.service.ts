import { Injectable, ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Group } from './group.entity';
import { GroupMembership } from './group-membership.entity';
import { GroupInvite } from './group-invite.entity';
import { User } from '../users/user.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private groupsRepository: Repository<Group>,
    @InjectRepository(GroupMembership)
    private membershipsRepository: Repository<GroupMembership>,
    @InjectRepository(GroupInvite)
    private invitesRepository: Repository<GroupInvite>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async createGroup(createGroupDto: CreateGroupDto, creatorId: string) {
    // Check if group name already exists
    const existingGroup = await this.groupsRepository.findOne({
      where: { name: createGroupDto.name }
    });

    if (existingGroup) {
      throw new ConflictException('A group with this name already exists');
    }

    let passwordHash: string | undefined = undefined;
    if (createGroupDto.password && createGroupDto.password.trim()) {
      passwordHash = await bcrypt.hash(createGroupDto.password.trim(), 10);
    }

    const group = this.groupsRepository.create({
      name: createGroupDto.name,
      passwordHash,
      creatorId,
    });

    const savedGroup = await this.groupsRepository.save(group);

    // Auto-join creator to the group as admin
    await this.membershipsRepository.save({
      groupId: savedGroup.id,
      userId: creatorId,
      role: 'admin',
    });

    return savedGroup;
  }

  async joinGroup(joinGroupDto: JoinGroupDto, userId: string) {
    const group = await this.groupsRepository.findOne({
      where: { id: joinGroupDto.groupId }
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Check if user is already a member
    const existingMembership = await this.membershipsRepository.findOne({
      where: { groupId: joinGroupDto.groupId, userId }
    });

    if (existingMembership) {
      throw new ConflictException('Already a member of this group');
    }

    // Check password if required
    if (group.passwordHash) {
      if (!joinGroupDto.password) {
        throw new UnauthorizedException('Password required');
      }
      const isPasswordValid = await bcrypt.compare(joinGroupDto.password, group.passwordHash);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid password');
      }
    }

    const membership = await this.membershipsRepository.save({
      groupId: joinGroupDto.groupId,
      userId,
    });

    return membership;
  }

  async getUserGroups(userId: string) {
    return this.groupsRepository
      .createQueryBuilder('group')
      .innerJoin('group.memberships', 'membership')
      .leftJoinAndSelect('group.creator', 'creator')
      .where('membership.userId = :userId', { userId })
      .orderBy('group.createdAt', 'DESC')
      .getMany();
  }

  async getGroupMembers(groupId: string, userId: string) {
    // Check if user is a member of the group
    const membership = await this.membershipsRepository.findOne({
      where: { groupId, userId }
    });

    if (!membership) {
      throw new UnauthorizedException('Not a member of this group');
    }

    return this.membershipsRepository
      .createQueryBuilder('membership')
      .leftJoinAndSelect('membership.user', 'user')
      .where('membership.groupId = :groupId', { groupId })
      .orderBy('membership.joinedAt', 'ASC')
      .getMany();
  }

  async searchGroups(query: string, userId: string) {
    return this.groupsRepository
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.creator', 'creator')
      .where('group.name ILIKE :query', { query: `%${query}%` })
      .andWhere('group.id NOT IN (' +
        'SELECT membership.group_id FROM group_memberships membership WHERE membership.user_id = :userId' +
      ')', { userId })
      .orderBy('group.createdAt', 'DESC')
      .getMany();
  }

  async leaveGroup(groupId: string, userId: string) {
    // Check if user is a member
    const membership = await this.membershipsRepository.findOne({
      where: { groupId, userId }
    });

    if (!membership) {
      throw new NotFoundException('Not a member of this group');
    }

    // If user is an admin, check if there are other admins
    if (membership.role === 'admin') {
      const totalMembers = await this.membershipsRepository.count({
        where: { groupId }
      });
      
      // If this is the last member, allow them to leave (will delete group)
      if (totalMembers > 1) {
        const otherAdmins = await this.membershipsRepository
          .createQueryBuilder('membership')
          .where('membership.groupId = :groupId', { groupId })
          .andWhere('membership.role = :role', { role: 'admin' })
          .andWhere('membership.userId != :userId', { userId })
          .getCount();
        
        if (otherAdmins === 0) {
          throw new ConflictException('Cannot leave group as the only admin. Please promote another member to admin first.');
        }
      }
    }

    // Remove the membership
    await this.membershipsRepository.remove(membership);

    // Check if this was the last member
    const remainingMembers = await this.membershipsRepository.count({
      where: { groupId }
    });

    // If no members left, delete the group
    if (remainingMembers === 0) {
      await this.groupsRepository.delete(groupId);
    }

    return { leftGroup: true, groupDeleted: remainingMembers === 0 };
  }

  async kickMember(groupId: string, targetUserId: string, kickerUserId: string) {
    // Check if the kicker has admin role
    const kickerMembership = await this.membershipsRepository.findOne({
      where: { groupId, userId: kickerUserId }
    });

    if (!kickerMembership || kickerMembership.role !== 'admin') {
      throw new UnauthorizedException('Only admins can kick members');
    }

    // Can't kick yourself
    if (targetUserId === kickerUserId) {
      throw new ConflictException('Cannot kick yourself');
    }

    // Check if target user is a member
    const membership = await this.membershipsRepository.findOne({
      where: { groupId, userId: targetUserId }
    });

    if (!membership) {
      throw new NotFoundException('User is not a member of this group');
    }

    // Remove the membership
    await this.membershipsRepository.remove(membership);

    return { kicked: true };
  }

  async updateMemberRole(groupId: string, targetUserId: string, newRole: string, updaterUserId: string) {
    // Check if the updater has admin role
    const updaterMembership = await this.membershipsRepository.findOne({
      where: { groupId, userId: updaterUserId }
    });

    if (!updaterMembership || updaterMembership.role !== 'admin') {
      throw new UnauthorizedException('Only admins can change member roles');
    }

    // Can't change your own role
    if (targetUserId === updaterUserId) {
      throw new ConflictException('Cannot change your own role');
    }

    // Check if target user is a member
    const targetMembership = await this.membershipsRepository.findOne({
      where: { groupId, userId: targetUserId }
    });

    if (!targetMembership) {
      throw new NotFoundException('User is not a member of this group');
    }

    // Update the role
    targetMembership.role = newRole;
    await this.membershipsRepository.save(targetMembership);

    return { updated: true };
  }

  async getInviteInfo(referrerId: string, groupId: string, userId: string) {
    const group = await this.groupsRepository.findOne({
      where: { id: groupId },
      relations: ['creator']
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const referrer = await this.membershipsRepository.findOne({
      where: { groupId, userId: referrerId },
      relations: ['user']
    });

    if (!referrer) {
      throw new NotFoundException('Referrer is not a member of this group');
    }

    const existingMembership = await this.membershipsRepository.findOne({
      where: { groupId, userId }
    });

    return {
      group: {
        id: group.id,
        name: group.name,
        requiresPassword: !!group.passwordHash
      },
      referrer: {
        firstName: referrer.user.firstName,
        lastName: referrer.user.lastName,
        email: referrer.user.email
      },
      alreadyMember: !!existingMembership
    };
  }

  async acceptInvite(referrerId: string, groupId: string, userId: string, password?: string) {
    const group = await this.groupsRepository.findOne({
      where: { id: groupId }
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const existingMembership = await this.membershipsRepository.findOne({
      where: { groupId, userId }
    });

    if (existingMembership) {
      throw new ConflictException('Already a member of this group');
    }

    // Check password if required
    if (group.passwordHash) {
      if (!password) {
        throw new UnauthorizedException('Password required');
      }
      const isPasswordValid = await bcrypt.compare(password, group.passwordHash);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid password');
      }
    }

    const membership = await this.membershipsRepository.save({
      groupId,
      userId,
      role: 'player'
    });

    return { joined: true, groupId };
  }

  async searchUsers(query: string): Promise<User[]> {
    return this.usersRepository
      .createQueryBuilder('user')
      .where('user.email ILIKE :query OR user.firstName ILIKE :query OR user.lastName ILIKE :query', 
        { query: `%${query}%` })
      .select(['user.id', 'user.email', 'user.firstName', 'user.lastName'])
      .limit(10)
      .getMany();
  }

  async sendInvite(groupId: string, inviteeId: string, inviterId: string) {
    // Check if inviter is a member of the group
    const inviterMembership = await this.membershipsRepository.findOne({
      where: { groupId, userId: inviterId }
    });

    if (!inviterMembership) {
      throw new UnauthorizedException('Not a member of this group');
    }

    // Check if invitee is already a member
    const existingMembership = await this.membershipsRepository.findOne({
      where: { groupId, userId: inviteeId }
    });

    if (existingMembership) {
      throw new ConflictException('User is already a member of this group');
    }

    // Check if invite already exists
    const existingInvite = await this.invitesRepository.findOne({
      where: { groupId, inviteeId }
    });

    if (existingInvite) {
      throw new ConflictException('Invite already sent to this user');
    }

    const invite = await this.invitesRepository.save({
      groupId,
      inviterId,
      inviteeId,
      status: 'pending'
    });

    return invite;
  }

  async getUserInvites(userId: string) {
    return this.invitesRepository
      .createQueryBuilder('invite')
      .leftJoinAndSelect('invite.group', 'group')
      .leftJoinAndSelect('invite.inviter', 'inviter')
      .where('invite.inviteeId = :userId', { userId })
      .orderBy('invite.createdAt', 'DESC')
      .getMany();
  }

  async getSentInvites(userId: string) {
    return this.invitesRepository
      .createQueryBuilder('invite')
      .leftJoinAndSelect('invite.group', 'group')
      .leftJoinAndSelect('invite.invitee', 'invitee')
      .where('invite.inviterId = :userId', { userId })
      .orderBy('invite.createdAt', 'DESC')
      .getMany();
  }

  async updateInviteStatus(inviteId: string, status: string, userId: string) {
    const invite = await this.invitesRepository.findOne({
      where: { id: inviteId, inviteeId: userId }
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    invite.status = status;
    await this.invitesRepository.save(invite);

    if (status === 'accepted') {
      // Join the group
      await this.membershipsRepository.save({
        groupId: invite.groupId,
        userId,
        role: 'player'
      });
    }

    return { updated: true };
  }
}