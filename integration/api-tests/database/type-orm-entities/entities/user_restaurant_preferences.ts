import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import * as types from './custom_enums'

@Entity('user_restaurant_preferences')
export class User_restaurant_preferences {
  @PrimaryGeneratedColumn({type: 'int'})
  id!: number;

  @Column('character varying', { name: 'user_id', nullable: false })
  user_id!: string;

  @Column('int', { name: 'avg_price_level' })
  avg_price_level!: any;

  @Column('smallint', { name: 'restaurant_type' })
  restaurant_type!: any;

  @Column('boolean', { name: 'vegetarian' })
  vegetarian!: any;

}
