import { Module } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [FirebaseModule],
  providers: [TeamsService],
  controllers: [TeamsController],
  exports: [TeamsService]
})
export class TeamsModule {}
