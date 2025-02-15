"use strict";
import { Transform } from "stream";

export class StreamBase extends Transform {

  options = {};

  constructor(options) {
    super(Object.assign({}, options, { writableObjectMode: true, readableObjectMode: true }));
    this.options = options;
  }
}

