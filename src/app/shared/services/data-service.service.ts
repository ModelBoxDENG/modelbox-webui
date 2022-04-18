import { Injectable } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import units from './units.json';
import { BasicServiceService } from '@shared/services/basic-service.service';
import { ToastService } from 'ng-devui/toast';
import { SolutionComponent } from 'src/app/components/solution/solution.component';

@Injectable({
  providedIn: 'root',
})
export class DataServiceService {
  nodeShapeCategories: any = [];
  public currentPage: any = "";

  public defaultSolutionGraph = "hello_world/hello_world.toml";
  public defaultFormat = "graphviz";
  public commonFlowunitPath = "/usr/local/lib";
  public defaultPerfDir = '/tmp/modelbox/perf/';
  public defaultFlowunitDir = "/usr/local/share/modelbox/solution/flowunit/";
  public defaultSearchPath = "/home";
  public defaultSrc: string = `digraph {
    node [shape=Mrecord];
  }`;
  public currentSolution = this.defaultSolutionGraph;
  public currentSolutionProject = {};
  public flowunits = [];
  public transformedFlowunits = [];
  public currentSolutionList = [];
  

  constructor(private sanitized: DomSanitizer,
    private basicService: BasicServiceService,
    private toastService: ToastService) {
    this.nodeShapeCategories.length = 0;
  }

  // 使用 unit name 及 type获取 对应的 unit
  getUnit(name, type) {
    let unit;
    if (this.nodeShapeCategories.length === 0) {
      this.loadFlowUnit(null, [], null);
    }
    this.nodeShapeCategories.forEach(cat => {
      cat.children.forEach(it => {
        if (it.name === name) {
          unit = it;
          if (it.type !== type && it.types.indexOf(type) === -1) {
            this.toastService.open({
              value: [{ severity: 'warn', content: unit.name + "顶点类型错误。请选择带有GPU的设备。" }],
              life: 3000,
              style: { top: '100px' }
            });
          }
        }
      });
    });
    return unit;
  }

  loadProjectFlowunit(path) {
    this.basicService.openProject(path).subscribe(
      (data: any) => {
        if (data) {
          this.flowunits = data.flowunits;
        }
      });
  }

  titleCase(str) {
    if (str){
      let newStr = str.slice(0, 1).toUpperCase() + str.slice(1).toLowerCase();
      return newStr;
    }else{
      return str;
    }
  }

  transformFlowunit() {
    this.transformedFlowunits = [];
    this.flowunits.map(ele => {
      let obj = {
        descryption: "",
        group: "",
        name: "",
        version: "",
        type: "",
        inputports: [],
        outputports: []
      };
      obj.descryption = ele.base.description;
      obj.group = this.titleCase(ele.base.group_type);
      obj.name = ele.base.name;
      obj.version = ele.base.version;
      obj.type = ele.base.type;
      for (let i in ele.input) {
        obj.inputports.push(ele.input[i]);
      }
      for (let i in ele.output) {
        obj.outputports.push(ele.output[i]);
      }
      this.transformedFlowunits.push(obj);
    })
  }

  loadFlowUnit(skip, dirs, path) {
    if (skip === null) {
      skip = false;
    }

    if (skip === "") {
      skip = false;
    }
    let params = {
      "skip-default": skip,
      dir: dirs,
    }

    if (path != null) {
      this.loadProjectFlowunit(path);
    }
    this.basicService.queryData(params).subscribe((data) => {
      let nodeShapeCategories = [];
      this.nodeShapeCategories = [];
      if (data.devices == null) {
        return;
      }
      if (this.flowunits &&  this.flowunits.length > 0) {
        this.transformFlowunit();
        data.flowunits.push(...this.transformedFlowunits);
      }
      data.flowunits.forEach(item => {
        const group = nodeShapeCategories.find(i => i.title === item.group);
        const unit = {
          ...item,
          title: item.name,
          active: nodeShapeCategories.length == 0 ? true : false,
          types: [
            ...new Set(
              data.flowunits.filter(u => u.name === item.name).map(i => i.type)
            ),
          ],
        };

        if (group) {
          group.children.push(unit);
        } else {
          nodeShapeCategories.push({
            title: item.group,
            collapsed: true,
            children: [unit],
          });
        }
      });
      this.nodeShapeCategories = nodeShapeCategories;
      this.nodeShapeCategories = this.nodeShapeCategories.map(
        item => {
          return {
            ...item,
            children: [...new Set(item.children.map(it => it.title))].map(it =>
              item.children.find(i => i.title === it)
            ),
          };
        }
      );
    })


  }

  nodeShapeCategoriesAdd(param) {
    this.nodeShapeCategories;
    const group = this.nodeShapeCategories.find(i => i.title === param.title);
    const unit = {
      name: param.flowunit_name,
      descryption: param.desc,
      title: param.flowunit_name,
      active: this.nodeShapeCategories.length == 0 ? true : false,
      type: param.device,
      types: [param.device],
      version: "1.0.0",
      virtual: false,
      inputports: param.port_infos.filter(x => x.port_type == "output"),
      outputports: param.port_infos.filter(x => x.port_type == "input")
    };
    if (group) {
      group.children.push(unit);
    } else {
      this.nodeShapeCategories.push({
        title: "Generic",
        collapsed: true,
        children: [unit],
      });
    }
  }

  getLabel(name, type, labelname) {
    let parts = [];
    let unit = this.getUnit(name, type);
    if (typeof unit === 'undefined') {
      return "";
    }

    if (unit.inputports && unit.inputports.length > 0) {
      parts.push(
        '{' +
        unit.inputports.map(item => `<${item.name}> ${item.name}`).join('|') +
        '}'
      );
    }
    parts.push(labelname);
    if (unit.outputports && unit.outputports.length > 0) {
      parts.push(
        '{' +
        unit.outputports
          .map(item => `<${item.name}> ${item.name}`)
          .join('|') +
        '}'
      );
    }
    return '{' + parts.join('|') + '}';
  }

  // 获取 port类型 input / output / main
  getport_type(unit, linkName): string {
    const [node, port] = linkName.split(':');
    if (!port) {
      return 'main';
    } else {
      if (unit && unit.inputports.find(it => it.name === port)) {
        return 'input';
      } else {
        return 'output';
      }
    }
  }

  formLabel(data) {
    let parts = [];
    if (data.inputports && data.inputports.length > 0) {
      parts.push(
        '{' +
        data.inputports.map(item => `<${item.name}> ${item.name}`).join('|') +
        '}'
      );
    }
    parts.push('_NODE_NAME_');
    if (data.outputports && data.outputports.length > 0) {
      parts.push(
        '{' +
        data.outputports
          .map(item => `<${item.name}> ${item.name}`)
          .join('|') +
        '}'
      );
    }
    return '{' + parts.join('|') + '}';
  }
}
