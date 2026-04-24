import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import * as types from './custom_enums'

@Entity('users_fcm')
export class Users_fcm {
  @PrimaryGeneratedColumn({type: 'int'})
  id!: number;

  @Column('bigint', { name: 'user_id', nullable: false })
  user_id!: number;

  @Column('character varying', { name: 'fcm_token' })
  fcm_token!: string;

}
