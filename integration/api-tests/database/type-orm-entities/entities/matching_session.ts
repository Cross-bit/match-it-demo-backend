import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import * as types from './custom_enums'

@Entity('matching_session')
export class Matching_session {
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

  @Column({type: 'enum', enum: types.sessionstate })
  session_state!: types.sessionstate;

  @Column({type: 'enum', enum: types.sessiontype })
  session_type!: types.sessiontype;

}
