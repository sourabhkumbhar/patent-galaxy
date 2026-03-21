import type { Cluster } from '../types/patent';
import { useProject } from '../config/ProjectContext';
import { Text } from '@react-three/drei';

interface ClusterLabelsProps {
  clusters: Cluster[];
  visibleSections: Set<string>;
}

/**
 * Renders floating 3D text labels for each CPC section cluster.
 * Labels always face the camera (billboard behavior via drei's Text).
 */
export default function ClusterLabels({ clusters, visibleSections }: ClusterLabelsProps) {
  const config = useProject();
  return (
    <group>
      {clusters.map((cluster) => {
        if (!visibleSections.has(cluster.shortLabel)) return null;

        return (
          <group key={cluster.label} position={[cluster.x, cluster.y + 40, cluster.z]}>
            <Text
              fontSize={5}
              color={cluster.color}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.2}
              outlineColor="#000000"
              font={undefined}
            >
              {cluster.label}
            </Text>
            <Text
              position={[0, -7, 0]}
              fontSize={2.5}
              color="#8888aa"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.1}
              outlineColor="#000000"
              font={undefined}
            >
              {cluster.count.toLocaleString()} {config.nodeLabelPlural}
            </Text>
          </group>
        );
      })}
    </group>
  );
}
