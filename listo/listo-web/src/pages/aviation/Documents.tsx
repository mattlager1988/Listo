import React from 'react';
import PageHeader from '../../components/PageHeader';
import DocumentList from '../../components/DocumentList';

const Documents: React.FC = () => {
  return (
    <div>
      <PageHeader title="Aviation Documents" />
      <DocumentList
        module="aviation"
        entityType="general"
        showUpload={true}
        showDocumentType={true}
      />
    </div>
  );
};

export default Documents;
