import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import * as types from './custom_enums'

@Entity('restaurant_ratings')
export class Restaurant_ratings {
  @PrimaryGeneratedColumn({type: 'int'})
  id!: number;

  @Column('character varying', { name: 'user_id', nullable: false })
  user_id!: string;

  @Column('character varying', { name: 'restaurant_id', nullable: false })
  restaurant_id!: string;

  @Column('smallint', { name: 'rating', nullable: false })
  rating!: any;

  @Column('varchar', { name: 'creation_time' })
  creation_time!: string;

}
