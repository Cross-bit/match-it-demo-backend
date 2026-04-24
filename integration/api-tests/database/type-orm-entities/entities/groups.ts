import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import * as types from './custom_enums'

@Entity('groups')
export class Groups {
  @PrimaryGeneratedColumn({type: 'int'})
  id!: number;

  @Column('uuid', { name: 'group_uuid', nullable: false })
  group_uuid!: string;

  @Column('character varying', { name: 'label', nullable: false })
  label!: string;

  @Column('varchar', { name: 'creation_time' })
  creation_time!: string;

}
