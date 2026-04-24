import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import * as types from './custom_enums'

@Entity('matching_session_users')
export class Matching_session_users {
  @PrimaryGeneratedColumn({type: 'int'})
  id!: number;

  @Column('bigint', { name: 'session_id', nullable: false })
  session_id!: number;

  @Column('uuid', { name: 'user_uuid', nullable: false })
  user_uuid!: string;

  @Column('boolean', { name: 'is_connected', nullable: false })
  is_connected!: any;

  @Column('boolean', { name: 'is_creator', nullable: false })
  is_creator!: any;

}
