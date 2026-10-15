import 'dotenv'
import 'cheerio'
import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'

const cheerioLoader = new CheerioWebBaseLoader('https://juejin.cn/post/7675273747710001206',{
    selector: '#juejin p'
})

const documents = await cheerioLoader.load();

const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 400,
    chunkOverlap: 50,
    separators: ['。',',','!','?']
})

const splitDocuments = await textSplitter.splitDocuments(documents);

console.log(splitDocuments);
