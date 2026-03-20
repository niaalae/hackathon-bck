import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { HeroAgentService } from '@/services/hero-agent.service';
import { ChatService } from '@/services/chat.service';
import { ChatDto } from '../dto/agent/chat.dto';

@Controller('agent')
export class AgentPublicController {
  constructor(
    private readonly heroAgentService: HeroAgentService,
    private readonly chatService: ChatService,
  ) { }

  @Post('hero')
  async hero(
    @Body()
    body: {
      prompt?: string;
      history?: { role: 'user' | 'assistant'; content: string }[];
    },
  ) {
    const prompt = typeof body?.prompt === 'string' ? body.prompt : '';
    const history = Array.isArray(body?.history) ? body.history : undefined;
    return this.heroAgentService.generateHeroReply(prompt, history);
  }

  @Get('hero')
  async heroGet(@Query('prompt') prompt?: string) {
    return this.heroAgentService.generateHeroReply(typeof prompt === 'string' ? prompt : '');
  }

  @Post('chat')
  async chat(@Body() body: ChatDto) {
    const reply = await this.chatService.chat(body.message, body.history ?? []);
    return { reply };
  }
}
