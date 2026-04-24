import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import * as types from './custom_enums'

@Entity('users_credentials')
export class Users_credentials {
  @PrimaryGeneratedColumn({type: 'int'})
  id!: number;

  @Column('bigint', { name: 'user_id', nullable: false })
  user_id!: number;

  @Column('character varying', { name: 'password_hash' })
  password_hash!: string;

  @Column('boolean', { name: 'is_verified' })
  is_verified!: any;

}
