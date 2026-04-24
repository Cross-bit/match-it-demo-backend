import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import * as types from './custom_enums'

@Entity('group_members_relations')
export class Group_members_relations {
  @PrimaryGeneratedColumn({type: 'int'})
  id!: number;

  @Column('bigint', { name: 'group_id' })
  group_id!: number;

  @Column('uuid', { name: 'user_uuid', nullable: false })
  user_uuid!: string;

  @Column('varchar', { name: 'creation_time' })
  creation_time!: string;

}
