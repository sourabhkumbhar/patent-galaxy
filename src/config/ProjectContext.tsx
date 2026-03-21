import { createContext, useContext } from 'react';
import type { ProjectConfig } from './types';
import { patentConfig } from './patents';

const ProjectContext = createContext<ProjectConfig>(patentConfig);

export function ProjectProvider({
  config,
  children,
}: {
  config: ProjectConfig;
  children: React.ReactNode;
}) {
  return (
    <ProjectContext.Provider value={config}>{children}</ProjectContext.Provider>
  );
}

export function useProject(): ProjectConfig {
  return useContext(ProjectContext);
}
