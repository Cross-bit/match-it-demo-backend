import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import * as types from './custom_enums'

@Entity('user_groups')
export class User_groups {
  @PrimaryGeneratedColumn({type: 'int'})
  id!: number;

  @Column('uuid', { name: 'uuid', nullable: false })
  uuid!: string;

  @Column('character varying', { name: 'label' })
  label!: string;

  @Column('uuid', { name: 'user_uuid', nullable: false })
  user_uuid!: string;

  @Column('varchar', { name: 'creation_time' })
  creation_time!: string;

}
