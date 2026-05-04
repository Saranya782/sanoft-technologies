import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [FirebaseModule],
  providers: [AlertsService],
  controllers: [AlertsController],
  exports: [AlertsService]
})
export class AlertsModule {}
