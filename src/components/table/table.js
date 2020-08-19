import React from 'react';
import ServerTable from './serverTable';
import img from '../../img';

function Table() {
  // const url = 'https://5efe2a74dd373900160b3f24.mockapi.io/api/users';

  const url = 'https://students-table.herokuapp.com/api/admin/students';
  const columns = ['avatar', 'name', 'email', 'phone', 'status', 'actions'];

  return (
    <ServerTable hover bordered url={url} columns={columns}>
      {(row, column) => {
        switch (column) {
          case 'avatar':
            return <img src={row.avatar} className="table-image" alt="img" />;
          case 'phone':
            return <p>{row.phone}</p>;
          case 'status':
            return (
              <span className={`status-${row.status}`}>
                {row.status === 'active' ? 'Активен' : null}
                {row.status === 'invited' ? 'Приглашен' : null}
                {row.status === 'inactive' ? 'Неактивен' : null}
              </span>
            );
          case 'actions':
            return (
              <div className="actions">
                <a href="#" rel="noopener noreferrer">
                  <img alt="img" src={img.pencilCreate} />
                </a>
                <a href="#" rel="noopener noreferrer">
                  <img alt="img" src={img.moreVertical} />
                </a>
              </div>
            );
          default:
            return row[column];
        }
      }}
    </ServerTable>
  );
}

export default Table;
