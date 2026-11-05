import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Friends {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    length: 50,
  })
  name: string;

  @Column({
    length: 50,
  })
  phone: string;

  // @CreateDateColumn({
  //   type: 'timestamp',
  // })
  // createdAt: Date;

  // @UpdateDateColumn({
  //   type: 'timestamp',
  // })
  // updatedAt: Date;
}
