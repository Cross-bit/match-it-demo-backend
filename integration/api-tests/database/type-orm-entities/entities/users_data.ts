import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import * as types from './custom_enums'

@Entity('users_data')
export class Users_data {
  @PrimaryGeneratedColumn({type: 'int'})
  id!: number;

  @Column('bigint', { name: 'user_id', nullable: false })
  user_id!: number;

  @Column('character varying', { name: 'thumbnail_name' })
  thumbnail_name!: string;

  @Column('character varying', { name: 'name' })
  name!: string;

  @Column('char', { name: 'sex' })
  sex!: any;

  @Column('smallint', { name: 'age' })
  age!: any;

}
