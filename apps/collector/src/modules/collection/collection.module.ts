import { Module } from '@nestjs/common';

import { OlhoVivoHttpClient } from './infrastructure/olho-vivo/olho-vivo-http.client';

@Module({
  providers: [
    {
      provide: OlhoVivoHttpClient,
      useFactory: () => new OlhoVivoHttpClient({ token: process.env.SPTRANS_API_TOKEN }),
    },
  ],
  exports: [OlhoVivoHttpClient],
})
export class CollectionModule {}
