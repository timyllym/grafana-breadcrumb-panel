import { PanelPlugin } from '@grafana/data';
import { BreadcrumbOptions } from './types';
import { BreadcrumbPanel } from './BreadcrumbPanel';
import { breadcrumbPanelMigrationHandler } from './BreadcrumbPanelMigrationHandler';
import './style.scss';

export const plugin = new PanelPlugin<BreadcrumbOptions>(BreadcrumbPanel)
  .setPanelOptions((builder) => {
    return builder
      .addBooleanSwitch({
        path: 'isRootDashboard',
        name: 'Is root dashboard',
        defaultValue: false,
      })
      .addBooleanSwitch({
        path: 'hideTextInRootDashboard',
        name: 'Hide text in root dashboard',
        defaultValue: false,
      })
      .addNumberInput({
        path: 'breadcrumbItemsMaxAmount',
        name: 'Limit the amount of breadcrumb items to',
        defaultValue: 25,
      });
  })
  .setMigrationHandler(breadcrumbPanelMigrationHandler);
