import 'dotenv/config.js';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import type { Runnable } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { Inject, Injectable } from '@nestjs/common';

import { CreateAiDto } from './dto/create-ai.dto.js';
import { UpdateAiDto } from './dto/update-ai.dto.js';

@Injectable()
export class AiService {
  private readonly chain: Runnable;

  constructor(@Inject('CHAT_MODEL') llm: ChatOpenAI) {
    const prompt = PromptTemplate.fromTemplate('请回答以下问题：\n\n {query}');

    this.chain = prompt.pipe(llm).pipe(new StringOutputParser());
  }

  runChain(query: string) {
    return this.chain.invoke({ query });
  }

  async *streamChain(query: string) {
    const stream = await this.chain.stream({ query });

    for await (const chunk of stream) {
      yield chunk;
    }
  }

  create(createAiDto: CreateAiDto) {
    return 'This action adds a new ai';
  }

  findAll() {
    return `This action returns all ai`;
  }

  findOne(id: number) {
    return `This action returns a #${id} ai`;
  }

  update(id: number, updateAiDto: UpdateAiDto) {
    return `This action updates a #${id} ai`;
  }

  remove(id: number) {
    return `This action removes a #${id} ai`;
  }
}
