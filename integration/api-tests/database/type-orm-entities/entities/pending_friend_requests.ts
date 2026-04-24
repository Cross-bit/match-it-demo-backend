import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import * as types from './custom_enums'

@Entity('pending_friend_requests')
export class Pending_friend_requests {
  @PrimaryGeneratedColumn({type: 'int'})
  id!: number;

  @Column('uuid', { name: 'uuid', nullable: false })
  uuid!: string;

  @Column('bigint', { name: 'user_id', nullable: false })
  user_id!: number;

  @Column('bigint', { name: 'friend_id', nullable: false })
  friend_id!: number;

  @Column('varchar', { name: 'creation_time' })
  creation_time!: string;

}
