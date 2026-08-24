/**
 * بارگذاری Definition های Data-driven.
 * Workstream C محتوای JSON ها را کامل می‌کند؛ این loader ثابت می‌ماند.
 */

import type {
  AlchemyDefinitions,
  AxisDefinition,
  CustomerDefinition,
  IngredientDefinition,
  PropertyDefinition,
  QualityTagRule,
  TuningConfig,
} from '../engine/types';

import propertiesJson from './properties.json';
import ingredientsJson from './ingredients.json';
import customersJson from './customers.json';
import qualityTagsJson from './qualityTags.json';
import tuningJson from './tuning.json';

export function loadDefinitions(): AlchemyDefinitions {
  return {
    properties: propertiesJson.properties as PropertyDefinition[],
    axes: propertiesJson.axes as AxisDefinition[],
    ingredients: ingredientsJson as IngredientDefinition[],
    customers: customersJson as CustomerDefinition[],
    qualityTags: qualityTagsJson as QualityTagRule[],
    tuning: tuningJson as TuningConfig,
  };
}
