import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AllocationInfo } from '@app/models/alloc-info.model';
import { AppInfo } from '@app/models/app-info.model';
import { ClusterInfo } from '@app/models/cluster-info.model';
import { HistoryInfo } from '@app/models/history-info.model';
import { NodeInfo } from '@app/models/node-info.model';
import { NodeUtilizationsInfo } from '@app/models/node-utilization.model';
import { Partition } from '@app/models/partition-info.model';

import { QueueInfo, QueuePropertyItem } from '@app/models/queue-info.model';
import { SchedulerResourceInfo } from '@app/models/resource-info.model';
import { SchedulerHealthInfo } from '@app/models/scheduler-health-info.model';
import { CommonUtil } from '@app/utils/common.util';
import { NOT_AVAILABLE } from '@app/utils/constants';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { EnvconfigService } from '../envconfig/envconfig.service';

@Injectable({
  providedIn: 'root',
})
export class SchedulerService {
  constructor(
    private httpClient: HttpClient,
    private envConfig: EnvconfigService
  ) {}

  fetchClusterList(): Observable<ClusterInfo[]> {
    const clusterUrl = `${this.envConfig.getSchedulerWebAddress()}/api/v1/clusters`;
    return this.httpClient.get(clusterUrl).pipe(map((data) => data as ClusterInfo[]));
  }

  fetchPartitionList(): Observable<Partition[]> {
    const partitionUrl = `${this.envConfig.getSchedulerWebAddress()}/api/v1/partitions`;
    return this.httpClient.get(partitionUrl).pipe(map((data) => data as Partition[]));
  }

  fetchSchedulerQueues(partitionId: string): Observable<any> {
    const queuesUrl = `${this.envConfig.getSchedulerWebAddress()}/api/v1/partition/${partitionId}/queues`;

    return this.httpClient.get(queuesUrl).pipe(
      map((dataWrapped: any) => {
        let data = dataWrapped;
        if (Array.isArray(dataWrapped)) data = dataWrapped[0];
        if (data && !CommonUtil.isEmpty(data)) {
          let rootQueue = new QueueInfo();
          rootQueue.queueName = data.queuename;
          rootQueue.status = data.status || NOT_AVAILABLE;
          rootQueue.isLeaf = data.isLeaf;
          rootQueue.isManaged = data.isManaged;
          rootQueue.partitionName = data.partition;
          rootQueue.children = null;
          rootQueue.id = data.id;
          this.fillQueueResources(data, rootQueue);
          this.fillQueuePropertiesAndTemplate(data, rootQueue);
          rootQueue = this.generateQueuesTree(data, rootQueue);

          return {
            rootQueue,
          };
        }

        return {
          rootQueue: null,
        };
      })
    );
  }

  fetchAppList(
    partitionId: string,
    queueId: string,
    offset: number = 0,
    limit: number = 10
  ): Observable<AppInfo[]> {
    const appsUrl = `${this.envConfig.getSchedulerWebAddress()}/v1/partition/${partitionId}/queue/${queueId}/applications?limit=${limit}&offset=${offset}`;

    return this.httpClient.get(appsUrl).pipe(
      map((data: any) => {
        const result: AppInfo[] = [];

        if (data && data.length > 0) {
          data.forEach((app: any) => {
            const appInfo = new AppInfo(
              app['id'],
              app['applicationID'],
              this.formatResource(app['usedResource'] as SchedulerResourceInfo),
              this.formatResource(app['pendingResource'] as SchedulerResourceInfo),
              this.formatResource(app['maxUsedResource'] as SchedulerResourceInfo),
              app['submissionTime'],
              app['lastStateChangeTime'],
              app['stateLog'],
              app['finishedTime'],
              app['applicationState'],
              []
            );
            appInfo.setLastStateChangeTime();

            const allocations = app['allocations'];
            if (allocations && allocations.length > 0) {
              const appAllocations: AllocationInfo[] = [];

              allocations.forEach((alloc: any) => {
                if (
                  alloc.allocationTags &&
                  alloc.allocationTags['kubernetes.io/meta/namespace'] &&
                  alloc.allocationTags['kubernetes.io/meta/podName']
                ) {
                  alloc['displayName'] =
                    `${alloc.allocationTags['kubernetes.io/meta/namespace']}/${alloc.allocationTags['kubernetes.io/meta/podName']}`;
                } else {
                  alloc['displayName'] = `<nil>`;
                }

                appAllocations.push(
                  new AllocationInfo(
                    alloc['displayName'],
                    alloc['allocationKey'],
                    alloc['allocationTags'],
                    this.formatResource(alloc['resource'] as SchedulerResourceInfo),
                    alloc['priority'],
                    alloc['queueName'],
                    alloc['nodeId'],
                    alloc['applicationId'],
                    alloc['partition']
                  )
                );
              });

              appInfo.setAllocations(appAllocations);
            }

            result.push(appInfo);
          });
        }

        return result;
      }),
      catchError((error) => {
        console.error('Error fetching app list:', error);
        return of([]);
      })
    );
  }

  fetchAppHistory(): Observable<HistoryInfo[]> {
    const appHistoryUrl = `${this.envConfig.getSchedulerWebAddress()}/api/v1/history/apps`;
    return this.httpClient.get(appHistoryUrl).pipe(
      map((data: any) => {
        const result: HistoryInfo[] = [];

        if (data && data.length) {
          data.forEach((history: any) => {
            result.push(
              new HistoryInfo(Math.floor(history.timestamp / 1e6), +history.totalApplications)
            );
          });
        }

        return result;
      })
    );
  }

  fetchContainerHistory(): Observable<HistoryInfo[]> {
    const containerHistoryUrl = `${this.envConfig.getSchedulerWebAddress()}/api/v1/history/containers`;
    return this.httpClient.get(containerHistoryUrl).pipe(
      map((data: any) => {
        const result: HistoryInfo[] = [];

        if (data && data.length) {
          data.forEach((history: any) => {
            result.push(
              new HistoryInfo(Math.floor(history.timestamp / 1e6), +history.totalContainers)
            );
          });
        }

        return result;
      })
    );
  }

  fetchNodeList(partitionId: string): Observable<NodeInfo[]> {
    const nodesUrl = `${this.envConfig.getSchedulerWebAddress()}/api/v1/partition/${partitionId}/nodes`;

    return this.httpClient.get(nodesUrl).pipe(
      map((data: any) => {
        const result: NodeInfo[] = [];

        if (data && data.length > 0) {
          data.forEach((node: any) => {
            const nodeInfo = new NodeInfo(
              node['nodeID'],
              node['hostName'],
              node['rackName'],
              node['partition'] || NOT_AVAILABLE,
              this.formatResource(node['capacity'] as SchedulerResourceInfo),
              this.formatResource(node['allocated'] as SchedulerResourceInfo),
              this.formatResource(node['occupied'] as SchedulerResourceInfo),
              this.formatResource(node['available'] as SchedulerResourceInfo),
              this.formatPercent(node['utilized'] as SchedulerResourceInfo),
              [],
              node['attributes']
            );

            const allocations = node['allocations'];

            if (allocations && allocations.length > 0) {
              const appAllocations: AllocationInfo[] = [];

              allocations.forEach((alloc: any) => {
                if (
                  alloc.allocationTags &&
                  alloc.allocationTags['kubernetes.io/meta/namespace'] &&
                  alloc.allocationTags['kubernetes.io/meta/podName']
                ) {
                  alloc['displayName'] =
                    `${alloc.allocationTags['kubernetes.io/meta/namespace']}/${alloc.allocationTags['kubernetes.io/meta/podName']}`;
                } else {
                  alloc['displayName'] = '<nil>';
                }

                appAllocations.push(
                  new AllocationInfo(
                    alloc['displayName'],
                    alloc['allocationKey'],
                    alloc['allocationTags'],
                    this.formatResource(alloc['resource'] as SchedulerResourceInfo),
                    alloc['priority'],
                    alloc['queueName'],
                    alloc['nodeId'],
                    alloc['applicationId'],
                    alloc['partition']
                  )
                );
              });

              nodeInfo.setAllocations(appAllocations);
            }

            result.push(nodeInfo);
          });
        }

        return result;
      })
    );
  }

  fetchNodeUtilizationsInfo(): Observable<NodeUtilizationsInfo[]> {
    const nodeUtilizationsUrl = `${this.envConfig.getSchedulerWebAddress()}/api/v1/scheduler/node-utilizations`;
    return this.httpClient
      .get(nodeUtilizationsUrl)
      .pipe(map((data: any) => data as NodeUtilizationsInfo[]));
  }

  fecthHealthchecks(): Observable<SchedulerHealthInfo> {
    const healthCheckUrl = `${this.envConfig.getSchedulerWebAddress()}/api/v1/scheduler/healthcheck`;
    return this.httpClient
      .get(healthCheckUrl)
      .pipe(map((data: any) => data as SchedulerHealthInfo));
  }

  private generateQueuesTree(data: any, currentQueue: QueueInfo) {
    if (data && data.children && data.children.length > 0) {
      const chilrenQs: QueueInfo[] = [];

      data.children.forEach((queueData: any) => {
        const childQueue = new QueueInfo();

        childQueue.queueName = queueData.queuename as string;
        childQueue.status = queueData.status || NOT_AVAILABLE;
        childQueue.parentQueue = currentQueue ? currentQueue : null;
        childQueue.isLeaf = queueData.isLeaf;
        childQueue.id = queueData.id;

        this.fillQueueResources(queueData, childQueue);
        this.fillQueuePropertiesAndTemplate(queueData, childQueue);
        chilrenQs.push(childQueue);

        return this.generateQueuesTree(queueData, childQueue);
      });

      currentQueue.children = chilrenQs;
    }

    return currentQueue;
  }

  private fillQueueResources(data: any, queue: QueueInfo) {
    const maxResource = data['maxResource'] as SchedulerResourceInfo;
    const guaranteedResource = data['guaranteedResource'] as SchedulerResourceInfo;
    const allocatedResource = data['allocatedResource'] as SchedulerResourceInfo;
    const pendingResource = data['pendingResource'] as SchedulerResourceInfo;
    const absUsedCapacity = data['absUsedCapacity'] as SchedulerResourceInfo;
    queue.maxResource = this.formatResource(maxResource);
    queue.guaranteedResource = this.formatResource(guaranteedResource);
    queue.allocatedResource = this.formatResource(allocatedResource);
    queue.pendingResource = this.formatResource(pendingResource);
    queue.absoluteUsedCapacity = this.formatPercent(absUsedCapacity);
    queue.absoluteUsedPercent = this.absUsagePercent(absUsedCapacity);
  }

  private fillQueuePropertiesAndTemplate(data: any, queue: QueueInfo) {
    if (data.properties && !CommonUtil.isEmpty(data.properties)) {
      const dataProps = Object.entries<string>(data.properties);

      queue.properties = dataProps.map((prop) => {
        return {
          name: prop[0],
          value: prop[1],
        } as QueuePropertyItem;
      });
    } else {
      queue.properties = [];
    }

    if (data.template) {
      queue.template = data.template;
    } else {
      queue.template = null;
    }
  }

  private formatResource(resource: SchedulerResourceInfo): string {
    const formatted: string[] = [];
    if (resource) {
      // Object.keys() didn't guarantee the order of keys, sort it before iterate.
      Object.keys(resource)
        .sort(CommonUtil.resourcesCompareFn)
        .forEach((key) => {
          let value = resource[key];
          let formattedKey = key;
          let formattedValue: string;

          switch (key) {
            case 'memory':
              formattedKey = 'Memory';
              formattedValue = CommonUtil.formatMemoryBytes(value);
              break;
            case 'vcore':
              formattedKey = 'CPU';
              formattedValue = CommonUtil.formatCpuCore(value);
              break;
            case 'ephemeral-storage':
              formattedValue = CommonUtil.formatEphemeralStorageBytes(value);
              break;
            default:
              if (key.startsWith('hugepages-')) {
                formattedValue = CommonUtil.formatMemoryBytes(value);
              } else {
                formattedValue = CommonUtil.formatOtherResource(value);
              }
              break;
          }
          formatted.push(`${formattedKey}: ${formattedValue}`);
        });
    }

    if (formatted.length === 0) {
      return NOT_AVAILABLE;
    }
    return formatted.join(', ');
  }

  private formatPercent(resource: SchedulerResourceInfo): string {
    const formatted = [];

    if (resource) {
      if (resource.memory !== undefined) {
        formatted.push(`Memory: ${CommonUtil.formatPercent(resource.memory)}`);
      }
      if (resource.vcore !== undefined) {
        formatted.push(`CPU: ${CommonUtil.formatPercent(resource.vcore)}`);
      }
    }
    if (formatted.length === 0) {
      return NOT_AVAILABLE;
    }
    return formatted.join(', ');
  }

  private absUsagePercent(resource: SchedulerResourceInfo): number {
    let result = 0;

    if (resource && resource.memory !== undefined) {
      result = Math.max(result, resource.memory);
    }

    if (resource && resource.vcore !== undefined) {
      result = Math.max(result, resource.vcore);
    }

    return Math.max(0, Math.min(result, 100));
  }
}
