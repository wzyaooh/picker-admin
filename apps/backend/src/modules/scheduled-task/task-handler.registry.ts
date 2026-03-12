import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';

import { TASK_HANDLER_KEY } from './task-handler.decorator';

@Injectable()
export class TaskHandlerRegistry implements OnModuleInit {
  private readonly logger = new Logger(TaskHandlerRegistry.name);
  private handlers = new Map<string, { instance: any; method: string }>();

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
  ) {}

  onModuleInit() {
    const providers = this.discoveryService.getProviders();

    for (const wrapper of providers) {
      const { instance } = wrapper;
      if (!instance || !Object.getPrototypeOf(instance)) continue;

      this.metadataScanner.scanFromPrototype(
        instance,
        Object.getPrototypeOf(instance),
        (methodName: string) => {
          const handlerName = this.reflector.get<string>(
            TASK_HANDLER_KEY,
            instance[methodName],
          );
          if (handlerName) {
            this.handlers.set(handlerName, { instance, method: methodName });
            this.logger.log(
              `Registered task handler: ${handlerName} -> ${wrapper.metatype?.name}.${methodName}`,
            );
          }
        },
      );
    }

    this.logger.log(`Total registered task handlers: ${this.handlers.size}`);
  }

  getHandler(name: string): { instance: any; method: string } | undefined {
    return this.handlers.get(name);
  }

  getAllHandlerNames(): string[] {
    return Array.from(this.handlers.keys());
  }
}
