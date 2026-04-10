// src/db.js
import Dexie from 'dexie';

// 1. 创建一个名为 PetParkDB 的本地数据库
export const db = new Dexie('PetParkDB');

// 2. 定义数据库的表结构 (Schema)
// ++id 表示自动生成递增的主键，后面的字段是我们要建立索引的字段
db.version(1).stores({
  tickets: '++id, isFixed, date, syncStatus' 
});