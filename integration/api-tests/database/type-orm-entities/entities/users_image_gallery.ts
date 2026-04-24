import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import * as types from './custom_enums'

@Entity('users_image_gallery')
export class Users_image_gallery {
  @PrimaryGeneratedColumn({type: 'int'})
  id!: number;

  @Column('uuid', { name: 'uuid', nullable: false })
  uuid!: string;

  @Column('uuid', { name: 'user_uuid', nullable: false })
  user_uuid!: string;

  @Column('character varying', { name: 'server_url' })
  server_url!: string;

  @Column('character varying', { name: 'server_path' })
  server_path!: string;

  @Column('character varying', { name: 'name' })
  name!: string;

  @Column('varchar', { name: 'creation_time' })
  creation_time!: string;

}
