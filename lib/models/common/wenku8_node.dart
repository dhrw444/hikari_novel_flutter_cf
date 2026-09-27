import 'cf_worker_node.dart';

enum Wenku8Node { wwwWenku8Net, wwwWenku8Cc, cfWorker }

extension Wenku8NodeDesc on Wenku8Node {
  String get node => ["https://www.wenku8.net", "https://www.wenku8.cc", CfWorkerNode.relayUrl][index];
}
