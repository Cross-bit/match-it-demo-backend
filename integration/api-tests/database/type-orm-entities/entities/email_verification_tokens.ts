import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import * as types from './custom_enums'

@Entity('email_verification_tokens')
export class Email_verification_tokens {
  @PrimaryGeneratedColumn({type: 'int'})
  id!: number;

  @Column('bigint', { name: 'user_id', nullable: false })
  user_id!: number;

  @Column('text', { name: 'token_hash', nullable: false })
  token_hash!: any;

  @Column('timestamptz', { name: 'created_at', nullable: false })
  created_at!: any;

  @Column('timestamptz', { name: 'expires_at', nullable: false })
  expires_at!: any;

}
