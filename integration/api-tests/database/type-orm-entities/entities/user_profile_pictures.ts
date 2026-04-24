import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import * as types from './custom_enums'

@Entity('user_profile_pictures')
export class User_profile_pictures {
  @PrimaryGeneratedColumn({type: 'int'})
  id!: number;

  @Column('bigint', { name: 'image_id', nullable: false })
  image_id!: number;

  @Column('uuid', { name: 'user_uuid', nullable: false })
  user_uuid!: string;

}
