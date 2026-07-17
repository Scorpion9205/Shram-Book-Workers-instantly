import { apiSlice } from "@/services/api/apiSlice";
import type { Skill } from "@/types";

interface SkillsResponse {
  success: boolean;
  skills: Skill[];
}

interface WorkerSkillsResponse {
    success: boolean;
    skills: Skill[];
}

const unwrapWorkerSkills = (items: Array<Skill | { skill: Skill }>): Skill[] =>
  items.map((item) => ("skill" in item ? item.skill : item));

export const skillsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSkills: builder.query<Skill[], void>({
      query: () => "/skills",
      transformResponse: (response: SkillsResponse) => response.skills,
      providesTags: ["Skill"],
    }),
    addWorkerSkill: builder.mutation<Skill[], { skillId?: string; skillIds: string[] }>({
      query: (body) => ({ url: "/skills/worker", method: "POST", body }),
      transformResponse: (response: WorkerSkillsResponse) =>
        response.skills,
      invalidatesTags: ["WorkerSkill", "WorkerProfile"],
    }),
    getWorkerSkills: builder.query<Skill[], void>({
      query: () => "/skills/worker",
      transformResponse: (response: WorkerSkillsResponse) =>
       response.skills,
      providesTags: ["WorkerSkill"],
    }),
  }),
});

export const { useGetSkillsQuery, useAddWorkerSkillMutation, useGetWorkerSkillsQuery } =
  skillsApi;
