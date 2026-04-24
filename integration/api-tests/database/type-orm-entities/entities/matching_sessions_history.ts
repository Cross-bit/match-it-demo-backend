import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import * as types from './custom_enums'

@Entity('matching_sessions_history')
export class Matching_sessions_history {
  @PrimaryGeneratedColumn({type: 'int'})
  id!: number;

  @Column('uuid', { name: 'uuid', nullable: false })
  uuid!: string;

  @Column('int', { name: 'creation_size', nullable: false })
  creation_size!: any;

  @Column('int', { name: 'real_size', nullable: false })
  real_size!: any;

  @Column('varchar', { name: 'creation_time' })
  creation_time!: string;

  @Column('varchar', { name: 'record_creation_time' })
  record_creation_time!: string;

}
