import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import * as types from './custom_enums'

@Entity('movie_ratings')
export class Movie_ratings {
  @PrimaryGeneratedColumn({type: 'int'})
  id!: number;

  @Column('character varying', { name: 'user_id', nullable: false })
  user_id!: string;

  @Column('bigint', { name: 'movie_id', nullable: false })
  movie_id!: number;

  @Column('smallint', { name: 'rating', nullable: false })
  rating!: any;

  @Column('varchar', { name: 'creation_time' })
  creation_time!: string;

}
