import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import * as types from './custom_enums'

@Entity('users')
export class Users {
  @PrimaryGeneratedColumn({type: 'int'})
  id!: number;

  @Column('uuid', { name: 'uuid', nullable: false })
  uuid!: string;

  @Column('character varying', { name: 'name' })
  name!: string;

  @Column('character varying', { name: 'email' })
  email!: string;

  @Column({type: 'enum', enum: types.userprivilegelevel })
  access_rights!: types.userprivilegelevel;

  @Column({type: 'enum', enum: types.userauthenticationmethod })
  authentication_method!: types.userauthenticationmethod;

}
