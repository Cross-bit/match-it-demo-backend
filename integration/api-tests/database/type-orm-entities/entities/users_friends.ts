import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import * as types from './custom_enums'

@Entity('users_friends')
export class Users_friends {
  @PrimaryGeneratedColumn({type: 'int'})
  id!: number;

  @Column('uuid', { name: 'token', nullable: false })
  token!: string;

  @Column('bigint', { name: 'user1_id', nullable: false })
  user1_id!: number;

  @Column('bigint', { name: 'user2_id', nullable: false })
  user2_id!: number;

  @Column('varchar', { name: 'creation_time' })
  creation_time!: string;

}
