import { PanelModel } from '@grafana/data';
import { BreadcrumbOptions } from './types';

export const breadcrumbPanelMigrationHandler = (
  panel: PanelModel<BreadcrumbOptions> & Record<string, any>
): Partial<BreadcrumbOptions> => {
  const newOptions: BreadcrumbOptions = {
    isRootDashboard: panel.options.isRootDashboard ?? panel.isRootDashboard,
    hideTextInRootDashboard: panel.options.hideTextInRootDashboard ?? panel.hideTextInRootDashboard,
    breadcrumbItemsMaxAmount: panel.options.breadcrumbItemsMaxAmount ?? parseInt(panel.breadcrumbItemsMaxAmount, 10),
  };

  const previousVersion = panel.pluginVersion || '1.0.0';
  if (previousVersion < '1.2.0') {
    const oldProps = ['isRootDashboard', 'hideTextInRootDashboard', 'breadcrumbItemsMaxAmount'];
    oldProps.forEach((prop) => delete panel[prop]);
  }

  return newOptions;
};
