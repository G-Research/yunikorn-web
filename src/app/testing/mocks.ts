/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { of } from 'rxjs';
import { LoadRemoteModuleEsmOptions } from '@angular-architects/module-federation';
import { SchedulerServiceLoader } from '@app/services/scheduler/scheduler-loader.service';

export const noopFn = () => {};
export const nullFn = () => null;

export const MockModuleFederationService = {
  loadRemoteModule: (config: LoadRemoteModuleEsmOptions) => of({}),
};

export const MockSchedulerService = {
  fetchClusterByName: () => of({}),
  fetchClusterList: () => of([]),
  fetchPartitionList: () => of([]),
  fetchSchedulerQueues: () => of({}),
  fetchAppList: () => of([]),
  fetchAppHistory: () => of([]),
  fetchContainerHistory: () => of([]),
  fetchNodeList: () => of([]),
  fecthHealthchecks: () => of([]),
};

export const MockNgxSpinnerService = {
  show: noopFn,
  hide: noopFn,
};

export const MockEnvconfigService = {
  getSchedulerWebAddress: noopFn,
  getAllocationsDrawerComponentRemoteConfig: nullFn,
  getSchedulerServiceRemoteConfig: nullFn,
};

export const MockEventBusService = {
  getEvent: () => of<any>(),
  publish: noopFn,
};

export const MockSchedulerServiceLoader = {
  loadScheduler: () => of(MockSchedulerService),
  initializeSchedulerService: () => of(MockSchedulerService),
  fetchClusterByName: () => of({}),
  fetchClusterList: () => of([]),
  fetchPartitionList: () => of([]),
  fetchSchedulerQueues: () => of({}),
  fetchAppList: () => of([]),
  fetchAppHistory: () => of([]),
  fetchContainerHistory: () => of([]),
};
