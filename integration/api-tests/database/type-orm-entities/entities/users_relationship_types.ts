import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import * as types from './custom_enums'

@Entity('users_relationship_types')
export class Users_relationship_types {
  @PrimaryGeneratedColumn({type: 'int'})
  id!: number;

  @Column('bigint', { name: 'relationship_id', nullable: false })
  relationship_id!: number;

  @Column({type: 'enum', enum: types.relationshiptype })
  relationship_type!: types.relationshiptype;

}
