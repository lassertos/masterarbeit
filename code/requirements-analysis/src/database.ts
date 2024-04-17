import { DataSource, EntityManager } from "typeorm";
import { Project, Requirement, RequirementVersion } from "./model";

export class ApplicationDatabase {
  private dataSource: DataSource;

  async initialize() {
    this.dataSource = await new DataSource({
      type: "sqlite",
      database: "database.db",
      synchronize: true,
      entities: [Project, Requirement, RequirementVersion],
    }).initialize();
  }

  async listProjects() {
    return this.dataSource.getRepository(Project).find({
      relations: {
        requirements: {
          history: true,
        },
      },
    });
  }

  async createProject(name: string) {
    const projectRepository = this.dataSource.getRepository(Project);

    const project = projectRepository.create({
      name: name,
      requirements: [],
    });

    return projectRepository.save(project);
  }

  async getProject(id: string) {
    const projectRepository = this.dataSource.getRepository(Project);

    const project = await projectRepository.findOneOrFail({
      where: { id },
      relations: {
        requirements: {
          history: true,
        },
      },
    });

    return project;
  }

  async updateProject(project: Project) {
    const projectRepository = this.dataSource.getRepository(Project);
    return await projectRepository.save(project);
  }

  async createRequirement(project: Project) {
    const requirementRepository = this.dataSource.getRepository(Requirement);

    const requirement = requirementRepository.create({
      title: "",
      originator: "",
      description: "",
      rationale: "",
      fitCriterion: "",
      customerSatisfaction: 1,
      customerDissatisfaction: 1,
      project,
      history: [],
    });

    return requirement;
  }

  async updateRequirement(updatedRequirement: Requirement) {
    await this.dataSource.transaction(async (transactionEntityManager) => {
      await this._updateRequirement(
        updatedRequirement,
        transactionEntityManager
      );
    });
  }

  async _updateRequirement(
    updatedRequirement: Requirement,
    entityManager: EntityManager
  ) {
    const requirementRepository = entityManager.getRepository(Requirement);
    const requirementVersionRepository =
      entityManager.getRepository(RequirementVersion);

    const oldRequirement = await requirementRepository.findOneOrFail({
      where: { id: updatedRequirement.id },
    });

    if (
      oldRequirement.description === updatedRequirement.description &&
      oldRequirement.rationale === updatedRequirement.rationale &&
      oldRequirement.fitCriterion === updatedRequirement.fitCriterion &&
      oldRequirement.customerSatisfaction ===
        updatedRequirement.customerSatisfaction &&
      oldRequirement.customerDissatisfaction ===
        updatedRequirement.customerDissatisfaction
    )
      return;

    await requirementRepository.update(
      { id: updatedRequirement.id },
      {
        title: updatedRequirement.title,
        description: updatedRequirement.description,
        rationale: updatedRequirement.rationale,
        fitCriterion: updatedRequirement.fitCriterion,
        customerSatisfaction: updatedRequirement.customerSatisfaction,
        customerDissatisfaction: updatedRequirement.customerDissatisfaction,
      }
    );

    const requirementVersion = requirementVersionRepository.create({
      type: "updated",
      timestamp: updatedRequirement.updatedAt,
      title: updatedRequirement.title,
      description: updatedRequirement.description,
      rationale: updatedRequirement.rationale,
      fitCriterion: updatedRequirement.fitCriterion,
      customerSatisfaction: updatedRequirement.customerSatisfaction,
      customerDissatisfaction: updatedRequirement.customerDissatisfaction,
      requirement: updatedRequirement,
    });

    await requirementVersionRepository.insert(requirementVersion);
  }

  async saveRequirement(requirement: Requirement) {
    console.log("saving requirement");
    return await this.dataSource.transaction(
      async (transactionEntityManager) => {
        const requirementRepository =
          transactionEntityManager.getRepository(Requirement);
        const foundRequirement = await requirementRepository.findOne({
          where: { id: requirement.id },
          relations: {
            history: true,
          },
        });

        if (requirement.id && foundRequirement) {
          console.log("updating requirement", requirement.id);
          await this._updateRequirement(requirement, transactionEntityManager);
        } else {
          console.log("creating requirement");
          const savedRequirement = await requirementRepository.save(
            requirement
          );
          const requirementVersionRepository =
            transactionEntityManager.getRepository(RequirementVersion);
          const requirementVersion = requirementVersionRepository.create({
            type: "created",
            timestamp: savedRequirement.updatedAt,
            title: savedRequirement.title,
            description: savedRequirement.description,
            rationale: savedRequirement.rationale,
            fitCriterion: savedRequirement.fitCriterion,
            customerSatisfaction: savedRequirement.customerSatisfaction,
            customerDissatisfaction: savedRequirement.customerDissatisfaction,
            requirement: savedRequirement,
          });
          await requirementVersionRepository.insert(requirementVersion);
        }

        return await requirementRepository.findOneOrFail({
          where: { id: requirement.id },
          relations: {
            history: true,
          },
        });
      }
    );
  }
}
