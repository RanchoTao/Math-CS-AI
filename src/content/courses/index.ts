import LinearAlgebra from './linear-algebra.mdx';
import MathematicalAnalysis from './mathematical-analysis.mdx';
import DataStructures from './data-structures.mdx';
import MachineLearning from './machine-learning.mdx';
import DeepLearning from './deep-learning.mdx';
import type { ComponentType } from 'react';

export const courseContent: Record<string, ComponentType> = {
  'linear-algebra': LinearAlgebra, 'mathematical-analysis': MathematicalAnalysis, 'data-structures': DataStructures,
  'machine-learning': MachineLearning, 'deep-learning': DeepLearning
};
