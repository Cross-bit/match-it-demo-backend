import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import * as types from './custom_enums'

@Entity('users_refresh_tokens')
export class Users_refresh_tokens {
  @PrimaryGeneratedColumn({type: 'int'})
  id!: number;

  @Column('bigint', { name: 'user_id', nullable: false })
  user_id!: number;

  @Column('character varying', { name: 'refresh_token' })
  refresh_token!: string;

}
