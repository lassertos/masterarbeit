import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
export class Project {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("varchar")
  name: string;

  @OneToMany(() => Requirement, (requirement) => requirement.project)
  requirements: Requirement[];
}

@Entity()
export class Requirement {
  @PrimaryGeneratedColumn("increment")
  id: string;

  @Column("varchar")
  title: string;

  @Column("varchar")
  description: string;

  @Column("varchar")
  rationale: string;

  @Column("varchar")
  fitCriterion: string;

  @Column("int")
  customerSatisfaction: 1 | 2 | 3 | 4 | 5;

  @Column("int")
  customerDissatisfaction: 1 | 2 | 3 | 4 | 5;

  @Column("varchar")
  originator: string;

  @ManyToOne(() => Project, (project) => project.requirements)
  project: Project;

  @OneToMany(
    () => RequirementVersion,
    (requirementVersion) => requirementVersion.requirement
  )
  history: RequirementVersion[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity()
export class RequirementVersion {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", update: false })
  type: "created" | "updated";

  @Column("varchar")
  title: string;

  @Column({ type: "varchar", update: false })
  description: string;

  @Column({ type: "varchar", update: false })
  rationale: string;

  @Column({ type: "varchar", update: false })
  fitCriterion: string;

  @Column({ type: "int", update: false })
  customerSatisfaction: 1 | 2 | 3 | 4 | 5;

  @Column({ type: "int", update: false })
  customerDissatisfaction: 1 | 2 | 3 | 4 | 5;

  @Column({ type: "datetime", update: false })
  timestamp: Date;

  @ManyToOne(() => Requirement, (requirement) => requirement.history)
  requirement: Requirement;
}
