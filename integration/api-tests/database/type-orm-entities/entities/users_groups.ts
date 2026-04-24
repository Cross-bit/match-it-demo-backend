import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import * as types from './custom_enums'

@Entity('users_groups')
export class Users_groups {
  @PrimaryGeneratedColumn({type: 'int'})
  id!: number;

  @Column('uuid', { name: 'uuid', nullable: false })
  uuid!: string;

  @Column('bigint', { name: 'user_id', nullable: false })
  user_id!: number;

}
