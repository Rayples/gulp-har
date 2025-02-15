import { StreamBase } from "./StreamBase.mjs";

export class FilterApiRequest extends StreamBase {
  static make(options) {
    return new FilterApiRequest(options);
  }

  constructor(options) {
    super(Object.assign({}, options, { writableObjectMode: true, readableObjectMode: true }));
  }

  async _transform(request, encoding, next) {
    
    let {entrie, options, handle_data, passed} = request;
    passed = options.apiInfo.filter(request, "entrie.request.url", "boolean");

    if(passed){
        let _method = entrie.request.method;
        handle_data.saveToApi = true;
        handle_data.apiInfo.method = _method;

        if(_method == "GET"){
            handle_data.apiInfo.queryString = entrie.request.queryString
        }
        if(["POST", "PUT", "DELETE"].includes(_method)){
            try {
                const { text } = entrie.request.postData || { text: '{}' };
                handle_data.apiInfo.postData = JSON.parse(text);
            } catch (error) {
                handle_data.apiInfo.postData = {};
                console.log(`[ERROR]:[PARSE ERROR] postData :${handle_data.file_path} -- [MESSAGE]: ${error.message}`);
                
            }
        }
    }
    
    this.push(request);
    next(null);
  }
}

