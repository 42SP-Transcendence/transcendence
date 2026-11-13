import { Module } from '@nestjs/common';

import { TRANSIT_DATA_SOURCE } from './application/transit-data-source';
import { OlhoVivoAdapter } from './infrastructure/olho-vivo/olho-vivo.adapter';
import { OlhoVivoHttpClient } from './infrastructure/olho-vivo/olho-vivo-http.client';

@Module({
  providers: [
    {
      provide: OlhoVivoHttpClient,
      useFactory: () => new OlhoVivoHttpClient({ token: process.env.SPTRANS_API_TOKEN }),
    },
    {
      provide: TRANSIT_DATA_SOURCE,
      useFactory: (client: OlhoVivoHttpClient) => new OlhoVivoAdapter(client),
      inject: [OlhoVivoHttpClient],
    },
  ],
  exports: [TRANSIT_DATA_SOURCE],
})
export class CollectionModule {}
